// Matches Game.color_map and get_color_from_rating(..., fade=false) in the client.
const ratingColors = [
  [0, "#7f9af9"],
  [5, "#6466cc"],
  [10, "#91cc53"],
  [15, "#d1bd28"],
  [20, "#c94324"],
  [25, "#82171f"],
  [30, "#845696"],
  [35, "#501247"],
] as const;

function getRatingColor(rating: number): string {
  for (let index = ratingColors.length - 1; index >= 0; index--) {
    const [threshold, color] = ratingColors[index];
    if (rating >= threshold) return color;
  }
  return ratingColors[0][1];
}

export function getDifficultyAppearance(value: string) {
  const parsed = Number(value);
  const rating = Number.isFinite(parsed) ? parsed : 0;
  return {
    rating,
    color: getRatingColor(rating),
    textColor: (rating >= 5 && rating < 10) || rating >= 20 ? "#fff" : "#101014",
  };
}
