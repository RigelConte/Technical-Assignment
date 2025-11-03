import { useState } from 'react';
import { sendNLPCommand, type NLPCommandResponse } from '@/api/nlp';
import type { StoreApi } from 'zustand';
import type { ModuleStore } from '@/scenes/createNewConfiguratorModule';
import { applySerializedState, serializeModuleStore } from '@/scenes/serialize';

type Props = {
  store: StoreApi<ModuleStore>;
  activeSavedId: string | null;
  onStateChanged: () => void;
};

export function NLPCommandPanel({ store, activeSavedId, onStateChanged }: Props) {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<NLPCommandResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Get current state from the store
      const currentState = serializeModuleStore(store);

      const result = await sendNLPCommand({
        command: command.trim(),
        currentState,
        ...(activeSavedId && { stateId: activeSavedId }),
      });

      setResponse(result);

      console.log('NLP Response:', result);

      if (result.success && result.state) {
        console.log('Applying state:', result.state);
        console.log('Current store state before:', store.getState());
        applySerializedState(result.state, store);
        console.log('Current store state after:', store.getState());
        onStateChanged();
        setCommand('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process command');
    } finally {
      setLoading(false);
    }
  }

  const showClarification = response && (response.intent.clarification || !response.success);
  const confidenceColor =
    !response ? '#6b7280' :
    response.intent.confidence >= 0.7 ? '#10b981' :
    response.intent.confidence >= 0.5 ? '#f59e0b' :
    '#ef4444';

  return (
    <div
      style={{
        marginBottom: '1rem',
        padding: '0.75rem',
        background: '#f9fafb',
        borderRadius: '0.5rem',
        border: '0.0625rem solid #e5e7eb',
      }}
    >
      <div
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '0.5rem',
        }}
      >
        Natural Language Commands
      </div>


      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '0.5rem',
          }}
        >
          <input
            type="text"
            placeholder="e.g., add a door"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              border: `0.0625rem solid ${focused ? '#2563eb' : '#e5e7eb'}`,
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              background: '#fff',
              outline: 'none',
              boxShadow: focused ? '0 0 0 0.125rem rgba(37,99,235,0.12)' : 'none',
              transition: 'border-color 120ms ease, box-shadow 120ms ease',
            }}
          />
          <button
            type="submit"
            disabled={loading || !command.trim()}
            style={{
              padding: '0.5rem 1rem',
              background: loading || !command.trim() ? '#9ca3af' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: loading || !command.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Processing...' : 'Send'}
          </button>
        </div>
      </form>

      {error && (
        <div
          style={{
            padding: '0.5rem',
            background: '#fee2e2',
            border: '0.0625rem solid #fecaca',
            borderRadius: '0.375rem',
            fontSize: '0.8125rem',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {response && (
        <div
          style={{
            padding: '0.5rem',
            background: response.success ? '#d1fae5' : '#fef3c7',
            border: `0.0625rem solid ${response.success ? '#a7f3d0' : '#fde68a'}`,
            borderRadius: '0.375rem',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600 }}>
              {response.success ? 'Success' : 'Needs Clarification'}
            </span>
            <span style={{ color: confidenceColor, fontWeight: 500 }}>
              {Math.round(response.intent.confidence * 100)}% confident
            </span>
          </div>

          {showClarification && (
            <div style={{ marginTop: '0.25rem' }}>
              {response.intent.clarification || response.message}
            </div>
          )}

          {response.success && response.message && (
            <div style={{ marginTop: '0.25rem', color: '#065f46' }}>
              {response.message}
            </div>
          )}
        </div>
      )}

      <details style={{ marginTop: '0.5rem' }}>
        <summary
          style={{
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: '#6b7280',
            userSelect: 'none',
          }}
        >
          Example commands
        </summary>
        <div
          style={{
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            color: '#6b7280',
            paddingLeft: '0.5rem',
          }}
        >
          <div>• "add a door"</div>
          <div>• "add 2 doors"</div>
          <div>• "remove door"</div>
          <div>• "add a shelf"</div>
          <div>• "add 3 shelves"</div>
          <div>• "remove shelf"</div>
          <div>• "change material to oak"</div>
          <div>• "make it 200cm wide"</div>
          <div>• "set height to 250cm"</div>
        </div>
      </details>
    </div>
  );
}
