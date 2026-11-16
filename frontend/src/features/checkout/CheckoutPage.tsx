import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CheckoutView, type CheckoutViewState } from "@/features/checkout/views/CheckoutView";
import { purchaseId, usePurchase, useServices } from "@/services";

/*
 * S2 — the simulated payment page (outside the product shell). Pay → paying → returning → Credits (replace, so browser
 * back never lands on a finished payment page). Back to Dubbed, the brand link and the browser back button all cancel an
 * awaiting purchase; finished or unknown purchases never charge.
 */
/* The pay/cancel operation state belongs to one purchase: a different purchaseId gets a fresh instance (the old one cancels its own). */
export function CheckoutPage() {
  const { purchaseId: idParam } = useParams();
  return <CheckoutScreen key={idParam ?? ""} />;
}

function CheckoutScreen() {
  const { purchaseId: idParam } = useParams();
  const services = useServices();
  const navigate = useNavigate();
  const purchase = usePurchase(idParam);
  const [phase, setPhase] = useState<"idle" | "paying" | "returning">("idle");
  const [payFailed, setPayFailed] = useState(false);
  const busy = useRef(false); // Pay pressed: never cancel behind its back, ignore repeats
  const alive = useRef(false);
  const life = useRef(0); // lifecycle token: bumped on leaving or on a different purchase; checked after every await

  const id = idParam ? purchaseId(idParam) : undefined;

  // Leaving without paying (browser back, a link) cancels. The check is deferred one tick so React StrictMode's
  // mount → unmount → mount in development does not count as leaving.
  useEffect(() => {
    alive.current = true;
    life.current += 1;
    return () => {
      alive.current = false;
      life.current += 1;
      setTimeout(() => {
        if (!alive.current && !busy.current && id) void services.credits.cancelPurchase(id);
      }, 0);
    };
  }, [services, id]);

  const value = purchase.data?.ok ? purchase.data.value : null;
  const mapped: CheckoutViewState = purchase.isError ? "error"
    : purchase.isPending ? "loading"
    : !value ? "not-found"
    : value.state === "awaiting" ? "default"
    : value.state === "completed" ? "completed"
    : "cancelled"; // cancelled or declined
  const state: CheckoutViewState = phase === "idle" ? mapped : phase;

  const pay = async () => {
    if (busy.current || !id || mapped !== "default") return;
    busy.current = true;
    setPayFailed(false);
    setPhase("paying");
    const token = life.current;
    const result = await services.credits.pay(id).catch(() => null);
    if (life.current !== token) return; // left meanwhile: nothing to update or navigate
    if (!result?.ok) {
      busy.current = false;
      setPhase("idle"); // Pay is the retry
      if (result?.error === "not-found") void purchase.refetch(); // the page then shows its not-found state
      else setPayFailed(true);
      return;
    }
    setPhase("returning");
    navigate(`/credits?purchase=${id}`, { replace: true });
  };

  const back = () => {
    if (busy.current) return;
    busy.current = true; // the explicit cancel below replaces the unmount one
    const token = life.current;
    void (async () => {
      if (id) await services.credits.cancelPurchase(id).catch(() => undefined);
      if (life.current !== token) return; // left meanwhile
      navigate("/credits", { replace: true });
    })();
  };

  return (
    <CheckoutView
      state={state}
      pack={value ? { credits: value.pack.credits, priceCents: value.pack.price.cents } : undefined}
      payError={payFailed}
      onPay={() => void pay()}
      onBack={back}
      onRetry={() => void purchase.refetch()}
      brandHref="/credits"
    />
  );
}
