import { Component } from 'react';
import { Link, useLocation } from 'react-router-dom';
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="mx-auto max-w-md p-8 text-center" role="alert"><h1 className="text-2xl font-bold">This room needs a moment.</h1><p className="my-4">Reload to try again, or return to the Lacunarium.</p><button className="underline mr-6" onClick={() => window.location.reload()}>Reload</button><Link className="underline" to="/">Return home</Link></div>;
    return this.props.children;
  }
}
export default function RouteErrorBoundary({ children }) { const location = useLocation(); return <Boundary key={location.pathname}>{children}</Boundary>; }
