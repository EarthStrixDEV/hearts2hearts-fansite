import "./auth.css";

export const metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="au-wrap">{children}</main>;
}
