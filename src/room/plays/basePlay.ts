import Room from "..";
import BallContact from "../classes/BallContact";
import PlayerContact from "../classes/PlayerContact";
import WithStateStore from "../classes/WithStateStore";
import { PlayableTeamId, Position } from "../HBClient";
import Chat from "../roomStructures/Chat";
import Ball from "../structures/Ball";
import DistanceCalculator from "../structures/DistanceCalculator";
import MapReferee from "../structures/MapReferee";
import PreSetCalculators from "../structures/PreSetCalculators";
import { flattenPlayer } from "../utils/haxUtils";
import { MAP_POINTS } from "../utils/map";
import FieldGoal from "./FieldGoal";
import KickOff, { KICK_OFF_PLAY_STATES } from "./Kickoff";
import { FG_PLAY_STATES } from "./play_events/FieldGoal.events";
import { PUNT_PLAY_STATES } from "./play_events/Punt.events";
import { SNAP_PLAY_STATES } from "./play_events/Snap.events";
import Punt from "./Punt";
import Snap from "./Snap";

export type PLAY_TYPES = Snap | FieldGoal | KickOff | Punt;

interface EndPlayData {
  netYards?: number;
  endPosition?: Position | null;
  addDown: boolean;
}

export type PLAY_STATES =
  | SNAP_PLAY_STATES
  | FG_PLAY_STATES
  | KICK_OFF_PLAY_STATES
  | PUNT_PLAY_STATES
  | "always";

export default abstract class BasePlay<
  T extends string
> extends WithStateStore<T> {
  protected _isLivePlay: boolean = false;
  protected _ballCarrier: ReturnType<typeof flattenPlayer> | null = null;
  protected _ballPositionOnSet: Position | null = null;
  protected _startingPosition: Position;
  time: number;

  constructor(time: number) {
    super();
    this.time = Math.round(time);
    this._startingPosition = Room.game.down.getLOS();
  }

  setBallCarrier(player: ReturnType<typeof flattenPlayer>) {
    this._ballCarrier = player;
    return this;
  }

  getBallCarrier() {
    if (!this._ballCarrier)
      throw Error("Game Error: Ball Carrier could not be found");
    return this._ballCarrier;
  }

  getBallCarrierSafe() {
    return this._ballCarrier;
  }

  get isLivePlay() {
    return this._isLivePlay;
  }

  protected _setLivePlay(bool: boolean) {
    Chat.send(`SET LIVE PLAY TO: ${bool}`);
    this._isLivePlay = bool;
  }

  getBallPositionOnSet() {
    return this._ballPositionOnSet;
  }

  setBallPositionOnSet(position: Position) {
    this._ballPositionOnSet = position;
    return this;
  }

  positionBallAndFieldMarkers() {
    Ball.setPosition(Room.game.down.getSnapPosition());
    Room.game.down.moveFieldMarkers();
    return this;
  }

  scorePlay(
    score: number,
    team: PlayableTeamId,
    teamEndZoneToScore: PlayableTeamId
  ) {
    this._setLivePlay(false);

    Room.game.addScore(team, score);
    Ball.score(teamEndZoneToScore);
    Room.game.sendScoreBoard();

    // Dont swap offense, we swap offense on the kickoff
  }

  endPlay({ netYards = 0, endPosition = null, addDown = true }: EndPlayData) {
    // console.log(netYards, endPosition, addDown);
    // // const isKickOffOrPunt = this.getState("punt") || this.getState("kickOff")
    // const updateDown = () => {
    //   console.log("UPDATE DOWN RAN");
    //   // Dont update the down if nothing happened, like off a pass deflection or on a punt and kickoff
    //   if (endPosition === null) return;
    //   const addYardsAndStartNewDownIfNecessary = () => {
    //     down.setLOS(endPosition);
    //     down.subtractYards(netYards);
    //     const currentYardsToGet = down.getYards();
    //     if (currentYardsToGet <= 0) {
    //       Chat.send("FIRST DOWN!");
    //       down.startNew();
    //     } else if (play.getState("fieldGoal")) {
    //       // This endplay only runs when there is a running play on the field goal
    //       Chat.send(`${ICONS.Loudspeaker} Turnover on downs FIELD GOAL!`);
    //       game.swapOffense();
    //       down.startNew();
    //     }
    //   };
    //   addYardsAndStartNewDownIfNecessary();
    // };
    // const enforceDown = () => {
    //   const currentDown = down.getDown();
    //   // if (currentDown === 4) {
    //   //   Chat.send(`4th down, GFI or PUNT`);
    //   // }
    //   if (currentDown === 5) {
    //     Chat.send(`${ICONS.Loudspeaker} Turnover on downs!`);
    //     game.swapOffense();
    //     down.startNew();
    //   }
    // };
    // game.setLivePlay(false);
    // if (addDown) {
    //   down.addDown();
    // }
    // updateDown();
    // enforceDown();
    // this.resetAfterDown();
  }

  /**
   * Returns information about the play when the offense made a play i.e catch, run, qb run etc
   */
  getPlayDataOffense(rawEndPosition: Position, offenseTeam: PlayableTeamId) {
    // Adjust the rawPlayerPosition
    const newEndPosition = PreSetCalculators.adjustPlayerPositionFrontAfterPlay(
      rawEndPosition,
      offenseTeam
    );

    // Calculate data with it
    const { yardLine: endYard, yards: netYards } = new DistanceCalculator()
      .calcNetDifferenceByTeam(
        this._startingPosition.x,
        newEndPosition.x,
        offenseTeam
      )
      .calculateAndConvert();

    return {
      netYards,
      endYard,
      endPosition: newEndPosition,
    };
  }

  handleSafety() {
    this._setLivePlay(false);
    Chat.send("SAFETY!!!");
    Ball.score(Room.game.defenseTeamId);

    const offenseEndZone = MapReferee.getTeamEndzone(Room.game.offenseTeamId);
    const offenseTwentyYardLine = new DistanceCalculator()
      .addByTeam(offenseEndZone, MAP_POINTS.YARD * 20, Room.game.offenseTeamId)
      .calculate();

    Room.game.setState("kickOffPosition", offenseTwentyYardLine);

    // // ? Why is offense scoring? Because we need the defense to get the ball, so offense has to kickoff
    // this.scorePlay(2, game.getDefenseTeam(), game.getOffenseTeam());

    // // Score the play first, so we can create a new down
    // down.setState("safetyKickOff", offenseTwentyYardLine);
  }

  handleTouchdown() {
    // First we need to get the type of touchdown, then handle
    // const { name, team } = this.getBallCarrier();
    // if (this.getState("twoPoint") === false) {
    //   Chat.send("yup");
    //   down.setState("canTwoPoint");
    // }
    // // Get what kind of touchdown for stats
    // const endzone = getOpposingTeamEndzone(team);
    // const { netYards } = this.getPlayData({ x: endzone }, team);
    // sendPlayMessage({
    //   type: PLAY_TYPES.TOUCHDOWN,
    //   playerName: name,
    //   netYards: netYards,
    // });
    // game.setLivePlay(false);
    // return this.getState("twoPoint")
    //   ? this.scorePlay(2, game.getOffenseTeam())
    //   : this.scorePlay(7, game.getOffenseTeam());
  }

  /**
   * Handles a regular touchdown
   */
  // private _handleRegularTouchdown() {}

  // /**
  //  * Handles a touchdown after a two point conversion
  //  */
  // private _handleTwoPointTouchdown() {}

  /* ABSTRACT */

  // protected abstract _handleBallContactOffense(
  //   ballContactObj: BallContact
  // ): void;
  // protected abstract _handleBallContactDefense(
  //   ballContactObj: BallContact
  // ): void;

  abstract validateBeforePlayBegins(): {
    valid: boolean;
    message?: string;
    sendToPlayer?: boolean;
  };
  abstract run(): void;
  abstract handleBallOutOfBounds(ballPosition: Position): void;
  abstract handleBallCarrierOutOfBounds(ballCarrierPosition: Position): void;
  abstract handleBallCarrierContactOffense(playerContact: PlayerContact): void;
  abstract handleBallCarrierContactDefense(playerContact: PlayerContact): void;
  abstract handleBallContact(ballContactObj: BallContact): void;
}
