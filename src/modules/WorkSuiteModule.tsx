import React, { useEffect, useState } from "react";
import { FolderKanban, ListTodo } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrentRole, useRBACGeofence } from "@/context/RBACGeofenceContext";
import { PageHeader, SegmentedTabs, TabPanel } from "@/components/DesignSystem";
import { WorkHubModule } from "@/modules/WorkHubModule";
import { WorkspaceModule } from "@/modules/WorkspaceModule";

type WorkArea = "MY_WORK" | "WORKSPACE";

export const WorkSuiteModule: React.FC<{ globalSearchQuery: string; initialArea?: WorkArea }> = ({ globalSearchQuery, initialArea }) => {
  const { t } = useLanguage();
  const { hasPermission } = useCurrentRole();
  const { moduleToggles } = useRBACGeofence();
  const canOpenMyWork = hasPermission("route:work_hub") && moduleToggles.workHubEnabled;
  const canOpenWorkspace = hasPermission("route:workspace") && moduleToggles.workspaceModuleEnabled;
  const [activeArea, setActiveArea] = useState<WorkArea>(() =>
    initialArea ?? (canOpenMyWork ? "MY_WORK" : "WORKSPACE")
  );

  useEffect(() => {
    if (canOpenMyWork && !canOpenWorkspace && activeArea !== "MY_WORK") {
      setActiveArea("MY_WORK");
    } else if (!canOpenMyWork && canOpenWorkspace && activeArea !== "WORKSPACE") {
      setActiveArea("WORKSPACE");
    }
  }, [activeArea, canOpenMyWork, canOpenWorkspace]);

  return (
    <div className="space-y-4">
      <PageHeader title={t("workhub.header.title")} />

      {canOpenMyWork && canOpenWorkspace && (
        <SegmentedTabs
          id="work-suite"
          ariaLabel={t("ui.view_switcher")}
          value={activeArea}
          onChange={(value) => setActiveArea(value as WorkArea)}
          layout="scroll"
          items={[
            {
              value: "MY_WORK",
              label: t("workhub.area.my_work"),
              icon: <ListTodo className="h-4 w-4" />
            },
            {
              value: "WORKSPACE",
              label: t("collab.workspace.title"),
              icon: <FolderKanban className="h-4 w-4" />
            }
          ]}
        />
      )}

      {canOpenMyWork && (
        <TabPanel
          id="work-suite-MY_WORK-panel"
          labelledBy={canOpenWorkspace ? "work-suite-MY_WORK-tab" : undefined}
          hidden={canOpenWorkspace && activeArea !== "MY_WORK"}
        >
          <WorkHubModule globalSearchQuery={globalSearchQuery} embedded />
        </TabPanel>
      )}

      {canOpenWorkspace && (
        <TabPanel
          id="work-suite-WORKSPACE-panel"
          labelledBy={canOpenMyWork ? "work-suite-WORKSPACE-tab" : undefined}
          hidden={canOpenMyWork && activeArea !== "WORKSPACE"}
        >
          <WorkspaceModule globalSearchQuery={globalSearchQuery} embedded />
        </TabPanel>
      )}
    </div>
  );
};
