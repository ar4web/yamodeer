import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";
import {
  ATTENDANCE_BLUEPRINT_DATA,
  AttendanceRecord,
  EmployeeRequestRecord,
  EmployeeTransferRequest,
  ExpenseClaimRecord,
  ExpenseStatus,
  FinancialWorkflowItem,
  FinancialWorkflowStatus,
  INITIAL_EMPLOYEE_REQUESTS,
  INITIAL_EXPENSE_CLAIMS,
  INITIAL_FINANCIAL_WORKFLOW_ITEMS,
  INITIAL_TRANSFER_REQUESTS,
  PERFORMANCE_BLUEPRINT_DATA,
  PerformanceReviewSnapshot,
  WorkflowStatus
} from "@/data/workspaceBlueprints";

interface OperationsContextValue {
  expenseClaims: ExpenseClaimRecord[];
  addExpenseClaim: (claim: ExpenseClaimRecord) => void;
  updateExpenseStatus: (id: string, status: ExpenseStatus) => void;
  transferRequests: EmployeeTransferRequest[];
  updateTransferStatus: (id: string, status: WorkflowStatus) => void;
  employeeRequests: EmployeeRequestRecord[];
  updateEmployeeRequestStatus: (id: string, status: WorkflowStatus) => void;
  attendanceRecords: AttendanceRecord[];
  performanceReviews: PerformanceReviewSnapshot[];
  financialWorkflowItems: FinancialWorkflowItem[];
  updateFinancialWorkflowStatus: (id: string, status: FinancialWorkflowStatus) => void;
}

const OperationsContext = createContext<OperationsContextValue | undefined>(undefined);

export const OperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenseClaims, setExpenseClaims] = useState(INITIAL_EXPENSE_CLAIMS);
  const [transferRequests, setTransferRequests] = useState(INITIAL_TRANSFER_REQUESTS);
  const [employeeRequests, setEmployeeRequests] = useState(INITIAL_EMPLOYEE_REQUESTS);
  const [financialWorkflowItems, setFinancialWorkflowItems] = useState(
    INITIAL_FINANCIAL_WORKFLOW_ITEMS
  );

  const addExpenseClaim = useCallback((claim: ExpenseClaimRecord) => {
    setExpenseClaims((current) => [claim, ...current]);
  }, []);

  const updateExpenseStatus = useCallback((id: string, status: ExpenseStatus) => {
    setExpenseClaims((current) =>
      current.map((claim) => (claim.id === id ? { ...claim, status } : claim))
    );
  }, []);

  const updateTransferStatus = useCallback((id: string, status: WorkflowStatus) => {
    setTransferRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, status } : request))
    );
  }, []);

  const updateEmployeeRequestStatus = useCallback((id: string, status: WorkflowStatus) => {
    setEmployeeRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, status } : request))
    );
  }, []);

  const updateFinancialWorkflowStatus = useCallback(
    (id: string, status: FinancialWorkflowStatus) => {
      setFinancialWorkflowItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item))
      );
    },
    []
  );

  const value = useMemo<OperationsContextValue>(
    () => ({
      expenseClaims,
      addExpenseClaim,
      updateExpenseStatus,
      transferRequests,
      updateTransferStatus,
      employeeRequests,
      updateEmployeeRequestStatus,
      attendanceRecords: ATTENDANCE_BLUEPRINT_DATA,
      performanceReviews: PERFORMANCE_BLUEPRINT_DATA,
      financialWorkflowItems,
      updateFinancialWorkflowStatus
    }),
    [
      expenseClaims,
      addExpenseClaim,
      updateExpenseStatus,
      transferRequests,
      updateTransferStatus,
      employeeRequests,
      updateEmployeeRequestStatus,
      financialWorkflowItems,
      updateFinancialWorkflowStatus
    ]
  );

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
};

export const useOperations = (): OperationsContextValue => {
  const value = useContext(OperationsContext);
  if (!value) throw new Error("useOperations must be used within OperationsProvider");
  return value;
};
