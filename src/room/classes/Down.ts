import Room, { client } from "..";
import { PlayableTeamId, PlayerObject, Position } from "../HBClient";
import Chat from "../roomStructures/Chat";
import Ball from "../roomStructures/Ball";
import DistanceCalculator, {
  DistanceConverter,
} from "../structures/DistanceCalculator";
import DownAndDistanceFormatter from "../structures/DownAndDistanceFormatter";
import { DISC_IDS, MAP_POINTS } from "../utils/map";
import { getRandomIntInRange } from "../utils/utils";

export default class Down {
  static CONFIG = {
    DEFAULT_YARDS_TO_GET: 20,
  };

  private _los: {
    x: number;
    y: 0;
  } = {
    x: 0,
    y: 0,
  };
  private _currentDown: 1 | 2 | 3 | 4 | 5 = 1;
  private _yardsToGet: number = Down.CONFIG.DEFAULT_YARDS_TO_GET;
  private _redZonePenalties: 0 | 1 | 2 | 3 = 0;
  _MAX_REZONE_PENALTIES: number = 3;

  getLOS() {
    return this._los;
  }

  setLOS(x: Position["x"]) {
    this._los.x = x;
    return this;
  }

  getLOSYard() {
    return DistanceConverter.toYardLine(this._los.x);
  }

  getYardsToGet() {
    return this._yardsToGet;
  }

  setYardsToGet(yards: number) {
    this._yardsToGet = yards;
    return this;
  }

  subtractYardsToGet(netYards: number) {
    this._yardsToGet -= netYards;
    return this;
  }

  getDown() {
    return this._currentDown;
  }

  setDown(down: 1 | 2 | 3 | 4) {
    this._currentDown = down;
    return this;
  }

  addDown() {
    this._currentDown++;
    return this;
  }

  startNew() {
    this._currentDown = 1;
    this._yardsToGet = Down.CONFIG.DEFAULT_YARDS_TO_GET;
    this._redZonePenalties = 0;
    return;
  }

  getSnapPosition() {
    const x = new DistanceCalculator()
      .subtractByTeam(this._los.x, MAP_POINTS.YARD * 5, Room.game.offenseTeamId)
      .calculate();

    return {
      x,
      y: 0,
    };
  }

  private _getLineToGainPoint() {
    return new DistanceCalculator()
      .addByTeam(
        this._los.x,
        MAP_POINTS.YARD * this._yardsToGet,
        Room.game.offenseTeamId
      )
      .calculate();
  }

  incrementRedZonePenalties() {
    this._redZonePenalties++;
  }

  hasReachedMaxRedzonePenalties() {
    return this._redZonePenalties === this._MAX_REZONE_PENALTIES;
  }

  getDownAndDistanceString() {
    const down = DownAndDistanceFormatter.formatDown(this._currentDown);

    const lineToGainPoint = this._getLineToGainPoint();

    const yardsOrGoal = DownAndDistanceFormatter.formatYardsToGain(
      lineToGainPoint,
      this._yardsToGet
    );
    const redZonePenalties = DownAndDistanceFormatter.formatRedZonePenalties(
      this._redZonePenalties
    );

    const LOSHalf = DownAndDistanceFormatter.formatPositionToMapHalf(
      this._los.x
    );

    const LOSYard = this.getLOSYard();

    return `${down} & ${yardsOrGoal} at ${LOSHalf}${LOSYard}${redZonePenalties}`;
  }

  sendDownAndDistance() {
    const downAndDistanceStr = this.getDownAndDistanceString();

    Chat.send(downAndDistanceStr);
  }

  setPlayers() {
    const fieldedPlayers = Room.game.players.getFielded();

    function setPlayerPositionRandom(this: Down, player: PlayerObject) {
      const randomYCoordinate = getRandomIntInRange(
        MAP_POINTS.TOP_HASH,
        MAP_POINTS.BOT_HASH
      );

      const tenYardsBehindLosX = new DistanceCalculator()
        .subtractByTeam(
          this.getLOS().x,
          MAP_POINTS.YARD * 10,
          player.team as PlayableTeamId
        )
        .calculate();

      const playerPositionToSet = {
        x: tenYardsBehindLosX,
        y: randomYCoordinate,
      };

      client.setPlayerDiscProperties(player.id, playerPositionToSet);
    }

    // Set the position of every fielded player
    fieldedPlayers.forEach((player) => {
      const hasSavedPosition = Room.game.players.playerPositionsMap.has(
        player.id
      );

      // If we dont have a saved position, field him 10 yards behin LOS randomly between one of the hashes
      if (!hasSavedPosition)
        return setPlayerPositionRandom.bind(this, player)();

      // Otherwise set him 7 yards behind LOS, but at the same y coordinate

      const { position, team } = Room.game.players.playerPositionsMap.get(
        player.id
      )!;

      const sevenYardsBehindLosX = new DistanceCalculator()
        .subtractByTeam(
          this.getLOS().x,
          MAP_POINTS.YARD * 7,
          team as PlayableTeamId
        )
        .calculate();

      const playerPositionToSet = {
        x: sevenYardsBehindLosX,
        y: position.y,
      };

      client.setPlayerDiscProperties(player.id, playerPositionToSet);
    });
  }

  // private _createInvisibleWallDefense() {
  //   Chat.send("Set the invisible wall");
  //   const defensePlayers = Room.game.players.getDefense();
  //   console.log(defensePlayers);

  //   console.log(Room.game.defenseTeamId);

  //   defensePlayers.forEach((player) => {
  //     const cf = client.CollisionFlags;
  //     console.log(cf);
  //     const cfTeam = Room.game.defenseTeamId === TEAMS.RED ? cf.red : cf.blue;

  //     console.log(cfTeam);
  //     client.setPlayerDiscProperties(player.id, { cGroup: cfTeam | cf.c0 });
  //   });
  // }

  setBallAndFieldMarkersPlayEnd() {
    // this._createInvisibleWallDefense();
    this.moveFieldMarkers();
    const snapPosition = this.getSnapPosition();
    Ball.setPosition(snapPosition);
    Ball.suppress();
  }

  hardSetPlayers() {
    const fieldedPlayers = Room.game.players.getFielded();

    fieldedPlayers.forEach((player) => {
      const sevenYardsBehindLosX = new DistanceCalculator()
        .subtractByTeam(
          this.getLOS().x,
          MAP_POINTS.YARD * 7,
          player.team as PlayableTeamId
        )
        .calculate();

      client.setPlayerDiscProperties(player.id, { x: sevenYardsBehindLosX });
    });
  }

  hardReset() {
    Room.game.play?.terminatePlayDuringError();
    this.sendDownAndDistance();
    this.setPlayers();
    // Sets the players too
    Room.game.endPlay();
    this.setBallAndFieldMarkersPlayEnd();
    Room.game.startSnapDelay();
  }

  resetAfterDown() {
    this.sendDownAndDistance();
    this.setPlayers();
    // Sets the players too
    Room.game.endPlay();
    this.setBallAndFieldMarkersPlayEnd();
    Room.game.startSnapDelay();
  }

  resetAfterScore() {
    Room.game.endPlay();
  }

  private _moveLOSMarkers() {
    client.setDiscProperties(DISC_IDS.LOS_TOP, {
      x: this._los.x,
    });
    client.setDiscProperties(DISC_IDS.LOS_BOT, {
      x: this._los.x,
    });
  }

  private _moveLineToGainMarkers(options: { hideLineToGain?: true } = {}) {
    const lineToGainPoint = this._getLineToGainPoint();

    const maybehideLineToGain = () => {
      // Hide line to gain if any of the following occurs:
      // 1. Line to gain is in the endzone
      // 2. During a punt or kickoff

      if (options.hideLineToGain) return true;

      // If we reset the play, always show it
      const lineToGainIsAfterEndzone =
        lineToGainPoint <= MAP_POINTS.RED_GOAL_LINE ||
        lineToGainPoint >= MAP_POINTS.BLUE_GOAL_LINE;

      if (lineToGainIsAfterEndzone) return true;

      if (Room.game.play === null) return false;

      return false;
    };

    const lineToGainX = maybehideLineToGain()
      ? MAP_POINTS.HIDDEN
      : lineToGainPoint;

    client.setDiscProperties(DISC_IDS.LTG_TOP, {
      x: lineToGainX,
      y: MAP_POINTS.TOP_SIDELINE,
    });
    client.setDiscProperties(DISC_IDS.LTG_BOT, {
      x: lineToGainX,
      y: MAP_POINTS.BOT_SIDELINE,
    });
  }

  moveFieldMarkers(options: { hideLineToGain?: true } = {}) {
    this._moveLOSMarkers();
    this._moveLineToGainMarkers(options);
    return this;
  }
}
