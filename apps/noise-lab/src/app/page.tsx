import NoiseViewer from '@/components/NoiseViewer';
import DeepslateViewer from '@/components/DeepslateViewer';

export default function Home() {
  return (
    <div className="grid gap-6 p-4">
      <div>
        <h2 className="mb-2 font-semibold">Custom Noise Viewer</h2>
        <NoiseViewer />
      </div>
      <div>
        <h2 className="mb-2 font-semibold">Deepslate-backed Noise Viewer</h2>
        <DeepslateViewer />
      </div>
    </div>
  );
}
