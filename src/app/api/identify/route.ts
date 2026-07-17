import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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
      .map((s: any, i: number) => `${i + 1}. Dr. ${s.doctor_name} (ID: ${s.doctor_id})`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Ikaw ay isang signature analysis expert. 
              
Tingnan mo ang uploaded signature at ihambing sa listahan ng mga doktor.

Mga doktor sa sistema:
${doctorList}

Sagutin mo sa JSON format:
{
  "identified_doctor_id": "UUID ng doktor o null kung hindi makilala",
  "identified_doctor_name": "Pangalan ng doktor o null",
  "confidence_score": 0.0 hanggang 1.0,
  "reasoning": "Bakit mo na-identify ito",
  "is_match_found": true o false
}

Kung hindi mo masigurado, ibaba ang confidence_score at sabihin sa reasoning.`,
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: signatureBase64,
              },
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const cleaned = content.text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Identify error:", error);
    return NextResponse.json(
      { error: "May error sa pag-identify ng signature." },
      { status: 500 }
    );
  }
}