import StaffAssignmentManager from "@/components/admin/StaffAssignmentManager";

const AdminStaffAssignments = () => {
  return (
    <div className="p-4 md:p-6">
      <StaffAssignmentManager mode="admin" />
    </div>
  );
};

export default AdminStaffAssignments;