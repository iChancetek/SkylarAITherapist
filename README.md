# iSkylar: AI Voice Therapist

iSkylar is an emotionally intelligent, voice-interactive Generative AI Therapist designed to offer empathetic mental health support.
This application is built with NextJS, React, ShadCN UI components, Tailwind CSS, and Genkit for AI functionalities.

It provides real-time voice-based therapeutic conversations, aiming to interpret emotional cues and deliver evidence-based therapeutic interventions.

## Core Features:
- AI-Powered Voice Therapy with iSkylar
- Real-time Voice Interaction (Speech-to-Text and Text-to-Speech)
- Dynamic Conversational Flow based on user input and emotional state
- Emotional Check-ins and Therapeutic Interventions (CBT, DBT, ACT, Mindfulness)
- Safety Protocols and Crisis Intervention Support

To get started or see the main user interface, take a look at `src/app/page.tsx`, which loads the `VoiceInterface` component (`src/components/voice-interface.tsx`).
The core AI logic for iSkylar's conversations is defined in the Genkit flow at `src/ai/flows/ai-therapy.ts`.
Safety mechanisms are handled by the flow in `src/ai/flows/safety-net.ts`.
