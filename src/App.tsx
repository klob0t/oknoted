import NoteManager from "./NoteManager";
import NoteWindow from "./NoteWindow";

function App() {
  const params = new URLSearchParams(window.location.search);
  const noteId = params.get("id");

  if (noteId) {
    return <NoteWindow id={noteId} />;
  }

  return <NoteManager />;
}

export default App;
