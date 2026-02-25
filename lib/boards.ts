export type InitialBoardTemplate = {
  title: string;
  image: string;
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
};

export const INITIAL_BOARD_TEMPLATES: InitialBoardTemplate[] = [
  {
    title: "DSA NOTES",
    image:
      "https://images.unsplash.com/photo-1464822759844-d150ad6d1b8a?auto=format&fit=crop&w=1400&q=80",
    backgroundColor: "#cfd2d9",
    gradientFrom: "#d6deec",
    gradientTo: "#aeb6c8",
  },
  {
    title: "TRANSACTIONS",
    image:
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1400&q=80",
    backgroundColor: "#cfd2d9",
    gradientFrom: "#d5dfed",
    gradientTo: "#afb8cb",
  },
  {
    title: "GAME DEV",
    image:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80",
    backgroundColor: "#cfd2d9",
    gradientFrom: "#d7dcf0",
    gradientTo: "#b6b6d6",
  },
  {
    title: "POEMS",
    image:
      "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1400&q=80",
    backgroundColor: "#cfd2d9",
    gradientFrom: "#d9e1eb",
    gradientTo: "#b3c1c9",
  },
];

export function buildInitialBoards(userId: string) {
  return INITIAL_BOARD_TEMPLATES.map((template) => ({
    title: template.title,
    image: template.image,
    backgroundMode: "image" as const,
    backgroundColor: template.backgroundColor,
    gradientFrom: template.gradientFrom,
    gradientTo: template.gradientTo,
    userId,
  }));
}
