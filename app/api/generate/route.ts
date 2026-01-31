import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { cv, job } = await req.json();
    const apiKey = "AIzaSyBkY90Mh9GBTuSmqjQY_BMQx8i9SGvmOhQ"; 
    
    // Vi bytter fra v1beta til v1
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Skriv en profesjonell jobbsøknad på norsk basert på CV: ${cv} og Jobb: ${job}` }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ ok: false, error: data.error.message });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Ingen tekst generert.";
    return NextResponse.json({ ok: true, letter: text });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message });
  }
}