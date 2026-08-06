import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const CONFIDENCE_THRESHOLD = 0.70;

export async function POST(req: NextRequest) {
  try {
    const { signatureBase64 } = await req.json();

    if (!signatureBase64) {
      return NextResponse.json(
        { error: "Walang signature na na-upload." },
        { status: 400 }
      );
    }

    // 1. Fetch ALL doctors na may signature_url
    const { data: doctors, error: fetchError } = await supabase
      .from("doctors")
      .select("id, name, department, specialty, signature_url")
      .not("signature_url", "is", null)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      return NextResponse.json(
        { error: "Error fetching reference signatures." },
        { status: 500 }
      );
    }

    if (!doctors || doctors.length === 0) {
      return NextResponse.json({
        identified_doctor_id: null,
        identified_doctor_name: null,
        confidence_score: 0.0,
        reasoning:
          "Walang reference signatures sa sistema. Subukan ulit pagkatapos mag-upload ng doctor signatures.",
        is_match_found: false,
      });
    }

    const doctorList = doctors
      .map((d, i) => `${i + 1}. ${d.name} (${d.specialty || "—"})`)
      .join("\n");

    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const contentParts: any[] = [
      {
        text: `IKAW AY SIGNATURE VERIFICATION EXPERT PARA SA CIMC HOSPITAL.

**CRITICAL MATCHING RULES:**
- I-analyze ang BUONG signature (top to bottom, left to right)
- Kung partial lang o incomplete ang uploaded signature, magbigay ng lower confidence
- ONLY accept confident matches (70% minimum)
- Kung uncertain, magbigay ng low confidence o NULL

**WHAT TO COMPARE:**
1. Overall shape at flow ng signature
2. Pen pressure at stroke characteristics
3. Unique loops, curves, at distinctive marks
4. Letter formation at connections
5. Size at spacing

**UPLOADED SIGNATURE:** Kung partial/angled lang, confidence mas mababa
**REFERENCE SIGNATURES:** Complete reference signatures para i-match

Mga Doktor sa Sistema:
${doctorList}

MATCHING LOGIC:
- Perfect match (95-100%): Identical characteristics, complete signature
- Strong match (85-94%): Very similar, minor variations normal
- Good match (70-84%): Recognizable same person, but differences present
- Weak match (50-69%): Some similarities pero may doubt
- No match (<50%): Completely different

**IMPORTANT:**
- Kung uploaded signature ay partial o angled, i-compare lang ng visible parts
- Kung complete reference pero partial uploaded, confidence mas mababa
- Huwag mag-force ng match kung uncertain - better to say NO MATCH

Sagutin mo ONLY in valid JSON format (walang markdown, walang backticks):
{
  "identified_doctor_id": "UUID o NULL kung walang match",
  "identified_doctor_name": "Doctor name o NULL",
  "confidence_score": 0.0 hanggang 1.0,
  "reasoning": "Detailed explanation - include kung partial/complete ang signature",
  "is_match_found": true/false
}`,
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: signatureBase64,
        },
      },
    ];

    // Add reference signature images (ALL doctors with a signature)
    for (const doctor of doctors) {
      try {
        const imageResponse = await fetch(doctor.signature_url);
        const blob = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(blob).toString("base64");

        contentParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64,
          },
        });
      } catch (err) {
        console.error(`Error fetching reference image for ${doctor.id}:`, err);
      }
    }

    const result = await model.generateContent(contentParts);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.confidence_score < CONFIDENCE_THRESHOLD) {
      console.log(
        `Confidence ${parsed.confidence_score} below threshold ${CONFIDENCE_THRESHOLD}. Rejecting match.`
      );
      return NextResponse.json({
        identified_doctor_id: null,
        identified_doctor_name: null,
        confidence_score: parsed.confidence_score,
        reasoning: `Ang matching confidence ay ${(parsed.confidence_score * 100).toFixed(1)}% - mas mababa sa 70% threshold. Hindi matukoy ang doktor nang may tiyak na kumpiyansa. Subukan ulit ng malinaw ang buong signature.`,
        is_match_found: false,
      });
    }

    let referenceImageUrl = null;
    if (parsed.identified_doctor_name) {
      const matchedDoctor = doctors.find(
        (d) => d.name === parsed.identified_doctor_name
      );
      if (matchedDoctor) {
        referenceImageUrl = matchedDoctor.signature_url;
      }
    }

    const { error: historyError } = await supabase.from("scan_history").insert({
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