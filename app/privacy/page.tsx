import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy — PitchPrep" };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold">Privacy</h1>
      <p className="text-muted">Plain-language summary of what happens to your information when you use PitchPrep.</p>

      <h2 className="text-base font-semibold">No accounts, no tracking</h2>
      <p>
        PitchPrep has no sign-up, ads or analytics. Your progress (exam answers, flashcard progress, role-play results) is saved
        only in this browser on this device. Clearing your browser&apos;s site data deletes it, and it does not follow you to
        other devices.
      </p>

      <h2 className="text-base font-semibold">Role-plays</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <b>Speaking:</b> transcription is done by your browser&apos;s built-in speech recognition. In Chrome and Edge, your
          browser sends the audio to its maker (Google or Microsoft) to turn it into text. PitchPrep never receives or stores audio.
          You can type your answers instead.
        </li>
        <li>
          <b>AI judge:</b> the scenario and the text of your answers are sent to Anthropic&apos;s Claude API to write questions and
          score your performance. Under Anthropic&apos;s commercial terms, API data is not used to train its models by default, and
          it may be kept for a limited time for safety monitoring.
        </li>
        <li>PitchPrep&apos;s server doesn&apos;t save your transcripts. Your results are saved only in your browser.</li>
      </ul>

      <h2 className="text-base font-semibold">Please don&apos;t share personal details</h2>
      <p>
        Role-plays are practice. Don&apos;t include your full name, school, address, phone number or other personal information in
        your answers.
      </p>

      <h2 className="text-base font-semibold">About the scores</h2>
      <p>
        Scores and feedback are AI estimates for practice and are not official DECA results. All questions and scenarios are
        original. PitchPrep is not affiliated with or endorsed by DECA Inc.
      </p>

      <p className="text-muted">Questions? Ask your chapter officers or advisor.</p>
    </article>
  );
}
