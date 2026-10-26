import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy: PitchPrep" };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 leading-relaxed text-soft">
      <h1 className="text-4xl font-bold text-foreground">Privacy</h1>
      <p className="text-muted">Plain-language summary of what happens to your information when you use PitchPrep.</p>

      <h2 className="pt-4 text-xl font-semibold text-foreground">Your account</h2>
      <p>
        Only emails your chapter admin added can sign in. Your account holds your email, first name and a scrambled (hashed)
        version of your password that nobody can read, including the admin. Your progress (exam answers, flashcards, role-play and written results) is saved to your
        account on PitchPrep&apos;s server on Cloudflare, so it follows you to any device. Only you can see it. There are no ads
        or analytics.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-foreground">Role-plays</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <b>Speaking:</b> transcription is done by your browser&apos;s built-in speech recognition. In Chrome and Edge, your
          browser sends the audio to its maker (Google or Microsoft) to turn it into text. PitchPrep never receives audio of your voice. The session recording stays in your browser and is never uploaded or saved.
          You can type your answers instead.
        </li>
        <li>
          <b>AI judge:</b> the scenario and the text of your answers are sent to an AI model on Cloudflare Workers AI to write the
          judge&apos;s questions, speak them aloud and score your performance. The AI service doesn&apos;t keep them.
          </li>
        <li>Your scored results, including the transcript, are saved to your account so you can review them. Audio is never saved.</li>
      </ul>

      <h2 className="pt-4 text-xl font-semibold text-foreground">Written entries and pitch decks</h2>
      <p>
        When you grade a written entry or deck, the file (or pasted text) is sent to Cloudflare Workers AI, which pulls out the text
        and scores it. The file and its text are not stored. The score and feedback are saved to your account.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-foreground">Please don&apos;t share personal details</h2>
      <p>
        Role-plays are practice. Don&apos;t include your full name, school, address, phone number or other personal information in
        your answers.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-foreground">About the scores</h2>
      <p>
        Scores and feedback are AI estimates for practice and are not official DECA results. All questions and scenarios are
        original. PitchPrep is not affiliated with or endorsed by DECA Inc.
      </p>

      <p className="text-muted">Questions? Ask your chapter officers or advisor.</p>
    </article>
  );
}
