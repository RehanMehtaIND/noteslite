export const CV_SEED = [
  {id:'col-backlog', type:'column', x:44, y:44, w:232, color:'#C07850',
   title:'Backlog', desc:'Start adding cards here.',
   cards:['Welcome to NotesLite'], z:1}
];

export const CV_CONNECTIONS: string[][] = [];

export const INITIAL_CARD_DATA: Record<string, any> = {
  'Welcome to NotesLite': {
    icon:'👋', coverA:'#C07850', coverB:'#D4956E',
    tags:[{l:'TUTORIAL',c:'#5A8A6A'}],
    blocks:[
      {t:'h1',v:'Welcome to NotesLite'},
      {t:'p',v:'This is your first card. Click on the text to start editing, or type / to open the block menu.'},
      {t:'todo',v:'Try dragging this card up or down', done:false},
      {t:'todo',v:'Create a new column', done:false},
      {t:'todo',v:'Add a new card', done:false}
    ]
  }
};
