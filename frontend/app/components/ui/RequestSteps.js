const FLOW = ["pending", "approved", "acquired"];

export default function RequestSteps({ status }) {
  const normalized = String(status ?? "pending").toLowerCase();
  const currentIndex = FLOW.indexOf(normalized);

  return (
    <div className="mt-2">
      <ul className="steps steps-xs w-full">
        {FLOW.map((step, index) => {
          let className = "step";
          if (normalized === "rejected") {
            className = index === 0 ? "step step-error" : "step";
          } else if (index <= currentIndex) {
            className = "step step-primary";
          }

          return (
            <li key={step} className={className}>
              {step}
            </li>
          );
        })}
      </ul>
      {normalized === "rejected" && (
        <p className="mt-1 text-xs text-error">Request was rejected by manager.</p>
      )}
    </div>
  );
}
