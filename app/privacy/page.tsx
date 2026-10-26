import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy: PitchPrep" };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 leading-relaxed text-soft">
      <h1 className="text-4xl font-bold text-foreground">Privacy</h1>
      <p className="text-muted">Plain-language summary of what happens to your information when you use PitchPrep.</p>

      <h2 className="pt-4 text-xl font-semibold text-foreground">No accounts, no tracking</h2>
      <p>
        PitchPrep has no sign-up, ads or analytics. Your progress (exam answers, flashcard progress, role-play results) is saved
        only in this browser on this device. Clearing your browser&apos;s site data deletes it, and it does not follow you to
        other devices.
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
          judge&apos;s questions, speak them aloud and score your performance. We do not store them on our server.
          </li>
        <li>PitchPrep&apos;s server doesn&apos;t save your transcripts. Your results are saved only in your browser.</li>
      </ul>

      <h2 className="pt-4 text-xl font-semibold text-foreground">Written entries and pitch decks</h2>
      <p>
        When you grade a written entry or deck, the file (or pasted text) is sent to Cloudflare Workers AI, which pulls out the text
        and scores it. The file and its text are not stored on our server. The score is saved only in your browser.
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
