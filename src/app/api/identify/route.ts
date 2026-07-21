import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Minimum confidence threshold - only accept matches above this
const CONFIDENCE_THRESHOLD = 0.85; // 85% minimum

export async function POST(req: NextRequest) {
  try {
    const { signatureBase64 } = await req.json();

    if (!signatureBase64) {
      return NextResponse.json(
        { error: "Walang signature na na-upload." },
        { status: 400 }
      );
    }

    // 1. Fetch ALL reference signatures from Supabase
    const { data: signatures, error: fetchError } = await supabase
      .from("signatures")
      .select(
        `
        id,
        image_url,
        doctor:doctors(id, name, department, specialty)
      `
      )
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      return NextResponse.json(
        { error: "Error fetching reference signatures." },
        { status: 500 }
      );
    }

    if (!signatures || signatures.length === 0) {
      return NextResponse.json(
        {
          identified_doctor_id: null,
          identified_doctor_name: null,
          confidence_score: 0.0,
          reasoning: "Walang reference signatures sa sistema. Subukan ulit pagkatapos mag-upload ng doctor signatures.",
          is_match_found: false,
        }
      );
    }

    // 2. Prepare doctor list for prompt
    const doctorList = signatures
      .map((s: any, i: number) => `${i + 1}. ${s.doctor.name} (${s.doctor.specialty || "—"})`)
      .join("\n");

    // 3. Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    // 4. Build content array with uploaded signature + reference signatures
    const contentParts: any[] = [
      {
        text: `IKAW AY SIGNATURE VERIFICATION EXPERT PARA SA CIMC.

**CRITICAL INSTRUCTIONS:**
- ONLY match kung 85% o mas mataas ang confidence
- Kung 85% pababa, i-return ang NULL (WALANG MATCH)
- HINDI mag-guess kung uncertain ka
- STRICT VERIFICATION LANG - mas mahalaga ang accuracy kaysa sa match

TASK: I-compare ang UPLOADED SIGNATURE laban sa lahat ng REFERENCE SIGNATURES.

Mga Doktor sa Sistema:
${doctorList}

MATCHING RULES:
- Tingnan ang: overall shape, strokes, pressure, flow, unique characteristics
- STRICT lang ang acceptance - kung 85% confidence pababa, walang match
- Huwag mag-accept ng partial matches o "close enough"
- Kung may doubt, i-return ang NULL

Sagutin mo ONLY in valid JSON format (walang markdown, walang backticks):
{
  "identified_doctor_id": "UUID o NULL kung walang match",
  "identified_doctor_name": "Doctor name o NULL",
  "confidence_score": 0.0 hanggang 1.0,
  "reasoning": "Detailed explanation ng matching process",
  "is_match_found": true/false
}

**REMEMBER: 85% minimum confidence required. NO EXCEPTIONS.**`,
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: signatureBase64,
        },
      },
    ];

    // 5. Add reference signature images
    for (const sig of signatures.slice(0, 5)) {
      // Limit to 5 references
      try {
        const imageResponse = await fetch(sig.image_url);
        const blob = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(blob).toString("base64");

        contentParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64,
          },
        });
      } catch (err) {
        console.error(`Error fetching reference image ${sig.id}:`, err);
      }
    }

    // 6. Send to Gemini for analysis
    const result = await model.generateContent(contentParts);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // 7. STRICT VALIDATION - Check confidence threshold
    if (parsed.confidence_score < CONFIDENCE_THRESHOLD) {
      // Below threshold - return no match even if Gemini found something
      console.log(
        `Confidence ${parsed.confidence_score} below threshold ${CONFIDENCE_THRESHOLD}. Rejecting match.`
      );
      return NextResponse.json({
        identified_doctor_id: null,
        identified_doctor_name: null,
        confidence_score: parsed.confidence_score,
        reasoning: `Ang matching confidence ay ${(parsed.confidence_score * 100).toFixed(1)}% - mas mababa sa 85% threshold. Imposibleng matukoy ang doktor nang may kumpiyansa.`,
        is_match_found: false,
      });
    }

    // 8. Get the matched doctor's signature image
    let referenceImageUrl = null;
    if (parsed.identified_doctor_name) {
      const matchedSig = signatures.find(
        (s: any) => s.doctor.name === parsed.identified_doctor_name
      );
      if (matchedSig) {
        referenceImageUrl = matchedSig.image_url;
      }
    }

    // 9. Store result in scan_history
    const { error: historyError } = await supabase
      .from("scan_history")
      .insert({
        scanned_image_url: signatureBase64,
        identified_doctor_id: parsed.identified_doctor_id,
        confidence_score: parsed.confidence_score,
        notes: parsed.reasoning,
      });

    if (historyError) {
      console.error("History insert error:", historyError);
    }

    return NextResponse.json({
      ...parsed,
      referenceImageUrl,
    });
  } catch (error) {
    console.error("Identify error:", error);
    return NextResponse.json(
      { error: "May error sa pag-identify ng signature." },
      { status: 500 }
    );
  }
}