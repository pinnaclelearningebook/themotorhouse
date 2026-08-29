import { Button } from "@/components/ui/Button";
import { PlateInput } from "@/components/ui/PlateInput";

/**
 * Plate input plus `Get my offer`, used in the hero and final CTA.
 * Submits the registration to /valuation as a GET, where step 1
 * continues with it prefilled — the lowest possible first ask.
 */
export function PlateForm({ id }: { id: string }) {
  return (
    <form
      action="/valuation"
      method="get"
      className="flex flex-col items-start gap-4 sm:flex-row sm:items-stretch"
    >
      <PlateInput id={id} />
      <Button className="w-full whitespace-nowrap sm:w-auto">
        Get my offer
      </Button>
    </form>
  );
}
