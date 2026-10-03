import type { ActionTarget } from "./UserActions";
import type { ChartsetSummary } from "./chartTypes";
import type { AdminRefreshState } from "./adminRefresh";

export type AdminPageContext = {
  refresh: AdminRefreshState;
  selectActionUser: (user: ActionTarget | null) => void;
  updateActionUser: (user: ActionTarget) => void;
  selectActionChartset: (chartset: ChartsetSummary | null) => void;
  updateActionChartset: (chartset: ChartsetSummary) => void;
};
