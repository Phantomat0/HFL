import PlayerStats, { PlayerStatQuery } from "../classes/PlayerStats";
import { PlayerObject } from "../HBClient";
import { SHOW_DEBUG_CHAT } from "../roomConfig";
import Chat from "../roomStructures/Chat";
import { PlayerRecord } from "../roomStructures/PlayerRecorder";
import Room from "../roomStructures/Room";
import Collection from "../utils/Collection";

export default class PlayerStatManager {
  statsCollection: Collection<PlayerRecord["recordId"], PlayerStats> =
    new Collection<PlayerRecord["recordId"], PlayerStats>();

  maybeCreateStatProfile(recordId: PlayerRecord["recordId"]) {
    const hasStatProfile = this.statsCollection.has(recordId);

    if (hasStatProfile) return;

    const playerStats = new PlayerStats(recordId);

    this.statsCollection.set(recordId, playerStats);
  }

  updatePlayerStat(
    playerId: PlayerObject["id"],
    statQuery: Partial<PlayerStatQuery>
  ) {
    const playerRecord = Room.game.players.getPlayerRecordById(playerId);

    if (!playerRecord) throw Error("Error finding player record");

    if (SHOW_DEBUG_CHAT) Chat.send(`STAT UPDATE: ${JSON.stringify(statQuery)}`);

    this.statsCollection.get(playerRecord.recordId)?.updateStats(statQuery);
  }
}
