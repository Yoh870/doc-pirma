import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
          identified_doctor_name: "Pangalan ng doktor o null",
          confidence_score: 0.0,
          reasoning: "Ang lagda ay hindi maitutugma dahil walang reference signature sa sistema.",
          is_match_found: false,
        }
      );
    }

    // 2. Prepare doctor list for prompt
    const doctorList = signatures
      .map((s: any, i: number) => `${i + 1}. ${s.doctor.name} (${s.doctor.department || "—"})`)
      .join("\n");

    // 3. Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    // 4. Build content array with uploaded signature + reference signatures
    const contentParts: any[] = [
      {
        text: `Ikaw ay isang signature analysis expert para sa City of Ilagan Medical Center.

TASK: Tingnan ang UPLOADED SIGNATURE (una) at ihambing sa lahat ng REFERENCE SIGNATURES (susunod).

Mga doktor sa sistema:
${doctorList}

IMPORTANTE:
- Tingnan ang overall shape, strokes, pressure, flow ng bawat signature
- Hanapin ang closest match base sa visual characteristics
- Return confidence score: 0.0 (walang match) hanggang 1.0 (perfect match)
- Kung confidence < 0.3, i-return ang null para sa doctor

Sagutin mo ONLY in valid JSON format (walang markdown, walang backticks):
{
  "identified_doctor_id": "UUID ng doktor o null",
  "identified_doctor_name": "Name ng doktor o null",
  "confidence_score": 0.0,
  "reasoning": "Why this match",
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

    // 5. Add reference signature images
    for (const sig of signatures.slice(0, 5)) {
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

    // 7. Store result in scan_history
    const { error: historyError } = await supabase.from("scan_history").insert({
      scanned_image_url: signatureBase64,
      identified_doctor_id: parsed.identified_doctor_id,
      confidence_score: parsed.confidence_score,
      notes: parsed.reasoning,
    });

    if (historyError) {
      console.error("History insert error:", historyError);
    }

    // 8. Get the matched doctor's signature image
    let referenceImageUrl = null;
    if (parsed.identified_doctor_id) {
      const matchedSig = signatures.find((s: any) => s.doctor.id === parsed.identified_doctor_id);
      if (matchedSig) {
        referenceImageUrl = matchedSig.image_url;
      }
    }

    return NextResponse.json({
      ...parsed,
      referenceImageUrl, // Add this
    });

  } catch (error) {
    console.error("Identify error:", error);
    return NextResponse.json(
      { error: "May error sa pag-identify ng signature." },
      { status: 500 }
    );
  }
}