import { GoogleGenAI, Modality } from "@google/genai";

export const MODELS = {
  CLIP: 'lyria-3-clip-preview',
  PRO: 'lyria-3-pro-preview',
};

export interface GenerationParams {
  prompt: string;
  lyrics?: string;
  genre: string;
  mood: string;
  tempo: number;
  instrumentation: string[];
  voiceSample?: {
    data: string; // base64
    mimeType: string;
  };
  referenceSong?: {
    data: string; // base64
    mimeType: string;
  };
  duration: 'short' | 'full';
}

export async function* generateMusicStream(params: GenerationParams) {
  const model = params.duration === 'short' ? MODELS.CLIP : MODELS.PRO;
  
  // Create a new instance right before the call as per Lyria/Veo guidelines
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [
    { text: `Generate a music track with the following specifications:
      Prompt: ${params.prompt}
      Genre: ${params.genre}
      Mood: ${params.mood}
      Tempo: ${params.tempo} BPM
      Instrumentation: ${params.instrumentation.join(', ')}
      ${params.lyrics ? `Lyrics to incorporate: ${params.lyrics}` : ''}
      ${params.voiceSample ? 'Use the provided voice sample as the primary vocal identity for the generated song.' : ''}
      ${params.referenceSong ? 'IMPORTANT: The generated song should be musically similar to the provided reference song in terms of arrangement, rhythm, and texture, but adapted to the prompt, genre, mood, and instrumentation specified above.' : ''}`
    }
  ];

  if (params.voiceSample) {
    parts.push({
      inlineData: {
        data: params.voiceSample.data,
        mimeType: params.voiceSample.mimeType
      }
    });
  }

  if (params.referenceSong) {
    parts.push({
      inlineData: {
        data: params.referenceSong.data,
        mimeType: params.referenceSong.mimeType
      }
    });
  }

  const responseStream = await ai.models.generateContentStream({
    model: model,
    contents: { parts },
    config: {
        responseModalities: [Modality.AUDIO],
    }
  });

  for await (const chunk of responseStream) {
    yield chunk;
  }
}

export function decodeAudioResponse(audioBase64: string, mimeType: string = 'audio/wav'): string {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}
