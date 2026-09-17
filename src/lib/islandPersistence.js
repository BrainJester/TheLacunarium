// One queue per mounted game. A failed load never enables writes; a conflict
// requires a reload instead of silently choosing one tab's progress.
export function createIslandSession(invoke, notify = () => {}) {
  let row = null, tail = Promise.resolve(), conflict = false;
  const queue = task => { const operation = tail.catch(() => {}).then(task); tail = operation; return operation; };
  async function write(name, data) {
    if (!row || conflict) throw Error('Reload the island before saving.');
    notify('saving');
    try {
      const result = await invoke(name, { save_id: row.save_id, revision: row.revision, ...(data ? { data } : {}) });
      const next = result.data;
      if (next?.save_id !== row.save_id || next.revision !== row.revision + 1) {
        conflict = true; throw Object.assign(Error('Uncertain save response. Reload your island.'), { status: 409 });
      }
      row = next; notify('saved'); return row;
    } catch (error) {
      conflict = (error.status || error.response?.status) === 409;
      notify(conflict ? 'conflict' : 'error'); throw error;
    }
  }
  return {
    async load() {
      const result = await invoke('loadMyIsland', {});
      const value = result.data;
      if (!value?.save_id || !Number.isInteger(value.revision)) throw Error('Invalid save response.');
      row = { save_id: value.save_id, revision: value.revision };
      notify('saved'); return value.data;
    },
    save(snapshot) { const copy = structuredClone(snapshot); return queue(() => write('saveMyIsland', copy)); },
    reset() { return queue(() => write('clearMyIsland')); },
    flush() { return tail; },
  };
}
