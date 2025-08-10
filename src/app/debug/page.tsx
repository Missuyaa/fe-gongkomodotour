import DebugApi from '@/components/DebugApi';

export default function DebugPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">API Debug Page</h1>
      <DebugApi />
    </div>
  );
}
