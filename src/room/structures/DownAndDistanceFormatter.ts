import { PlayableTeamId, Position } from "../HBClient";
import { MAP_POINTS } from "../utils/map";
import { TEAMS } from "../utils/types";
import { toOrdinalSuffix } from "../utils/utils";

class DownAndDistanceFormatter {
  formatRedZonePenalties(currentRedZonePenalties: 0 | 1 | 2 | 3) {
    if (currentRedZonePenalties === 0) return ""; // If there are no redzone penalties
    return ` [${currentRedZonePenalties}/3]`;
  }

  formatDown(currentDown: 1 | 2 | 3 | 4 | 5) {
    return toOrdinalSuffix(currentDown);
  }

  formatYardsToGain(lineToGainPoint: Position["x"], lineToGainYards: number) {
    if (
      lineToGainPoint <= MAP_POINTS.RED_GOAL_LINE ||
      lineToGainPoint >= MAP_POINTS.BLUE_GOAL_LINE
    )
      return "GOAL";
    return lineToGainYards;
  }

  formatPositionToMapHalf = (x: Position["x"]) => {
    if (x > MAP_POINTS.KICKOFF) return "BLUE ";
    if (x < MAP_POINTS.KICKOFF) return "RED ";
    return "";
  };

  formatPositionToMapHalfInt = (x: Position["x"]): PlayableTeamId => {
    if (x > MAP_POINTS.KICKOFF) return TEAMS.BLUE as PlayableTeamId;
    return TEAMS.RED as PlayableTeamId;
  };
}

export default new DownAndDistanceFormatter();
