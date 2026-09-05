import { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { ProductTable } from './components/ProductTable.js';
import { StoreCounter } from './components/StoreCounter.js';
import { Typeahead } from './components/Typeahead.js';
import { VirtualList } from './components/VirtualList.js';

const TABS = {
  typeahead: { label: 'Typeahead', render: () => <Typeahead /> },
  table: { label: 'Table', render: () => <ProductTable /> },
  virtual: { label: 'Virtual list', render: () => <VirtualList /> },
  store: { label: 'Store', render: () => <StoreCounter /> },
} as const;

type TabKey = keyof typeof TABS;

export function App(): React.JSX.Element {
  const [tab, setTab] = useState<TabKey>('typeahead');

  return (
    <main>
      <header>
        <h1>React Lab</h1>
        <p className="muted">
          Each demo has an Angular twin in <code>apps/angular-lab</code>. Read both, then read{' '}
          <code>docs/03-angular/react-vs-angular.md</code>.
        </p>
      </header>

      <nav className="tabs" role="tablist">
        {(Object.keys(TABS) as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'tab active' : 'tab'}
            onClick={() => setTab(key)}
          >
            {TABS[key].label}
          </button>
        ))}
      </nav>

      <ErrorBoundary>{TABS[tab].render()}</ErrorBoundary>
    </main>
  );
}
