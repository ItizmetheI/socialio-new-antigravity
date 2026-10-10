import PageHeader from "../components/workspace/PageHeader";
import ProfileSection from "../app/ProfileSection";

// Admins and team members: their own name and password (clients have the
// same form on their Account page).
export default function StaffAccount() {
  return (
    <div className="max-w-5xl">
      <PageHeader title="Your account" description="Your name and password." />
      <ProfileSection />
    </div>
  );
}
