import { useSearchParams } from "react-router";
import AdminButton from "../AdminButton";
import ActionLogsPage from "./ActionLogsPage";
import AccessLogsPage from "./AccessLogsPage";

export default function AdminLogsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "access" ? "access" : "action";
  const tabs = <div className="admin-logs__tabs" role="group" aria-label="Admin log categories">
    {(["action", "access"] as const).map(value => <AdminButton key={value} size="small"
      selected={tab === value} aria-pressed={tab === value} onClick={() => {
        if (tab === value) return;
        setParams(current => {
          const next = new URLSearchParams(current);
          if (value === "action") next.delete("tab");
          else next.set("tab", value);
          return next;
        }, { replace: true });
      }}>
      {value === "action" ? "ACTION LOGS" : "ACCESS LOGS"}
    </AdminButton>)}
  </div>;

  return tab === "action" ? <ActionLogsPage tabs={tabs} /> : <AccessLogsPage tabs={tabs} />;
}
