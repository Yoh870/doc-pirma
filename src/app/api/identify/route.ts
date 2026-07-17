import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { signatureBase64, signatures } = await req.json();

    if (!signatureBase64 || !signatures?.length) {
      return NextResponse.json(
        { error: "Walang signature na na-upload o walang stored signatures." },
        { status: 400 }
      );
    }

    const doctorList = signatures
      .map((s: { doctor_id: string; doctor_name: string }, i: number) =>
        `${i + 1}. ${s.doctor_name} (ID: ${s.doctor_id})`
      )
      .join("\n");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

    const prompt = `Ikaw ay isang signature analysis expert.

Tingnan mo ang uploaded signature at ihambing sa listahan ng mga doktor.

Mga doktor sa sistema:
${doctorList}

Sagutin mo ONLY in JSON format, walang markdown, walang backticks:
{
  "identified_doctor_id": "UUID ng doktor o null kung hindi makilala",
  "identified_doctor_name": "Pangalan ng doktor o null",
  "confidence_score": 0.0 hanggang 1.0,
  "reasoning": "Bakit mo na-identify ito",
  "is_match_found": true o false
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: signatureBase64,
        },
      },
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Identify error:", error);
    return NextResponse.json(
      { error: "May error sa pag-identify ng signature." },
      { status: 500 }
    );
  }
}