import { useLocation } from 'react-router-dom';
import Lacunarium3D from '@/components/lacunarium/Lacunarium3D';
export default function Home() {
  const location = useLocation();
  return <Lacunarium3D key={location.key} />;
}
