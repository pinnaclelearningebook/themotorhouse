import { AGENT } from "@/config/site";

/**
 * The opening line, in one place, written by the server.
 *
 * It used to be composed in the widget and shown only there, which meant
 * the conversation on our side began with the seller's first message.
 * The prompt tells Maya to disclose in her own first sentence, so with no
 * history she treated that first message as first contact and opened with
 * the disclosure again — the same greeting above and below the seller's
 * question, which is what it looked like on screen.
 *
 * So the server writes it into the transcript as the first assistant turn
 * and returns it for the widget to render. The model now sees that it has
 * already introduced itself, and prompt.md's "after that, the disclosure
 * is answered, not announced" applies from the second turn as intended.
 */
export function openingLine(vehicleName: string | null): string {
  const seen = vehicleName
    ? `I can see the ${vehicleName} on your screen.`
    : "I'll have your car's details once the registration goes in.";
  return `${AGENT.disclosure}. ${seen} Ask me anything about how this works.`;
}
