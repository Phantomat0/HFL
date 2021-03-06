import BallContact from "../../classes/BallContact";
import PlayerContact from "../../classes/PlayerContact";
import { PlayableTeamId, PlayerObjFlat, Position } from "../../HBClient";
import Chat from "../../roomStructures/Chat";
import Room from "../../roomStructures/Room";
import GameReferee from "../../structures/GameReferee";
import MapReferee from "../../structures/MapReferee";
import ICONS from "../../utils/Icons";
import BasePlay from "../BasePlay";

export interface FieldGoalStore {
  fieldGoal: true;
  fieldGoalKicked: true;
  fieldGoalLineBlitzed: true;
  fieldGoalBlitzed: true;
  ballRan: true;
}

export default abstract class FieldGoalEvents extends BasePlay<FieldGoalStore> {
  protected abstract _kicker: PlayerObjFlat;
  protected abstract _setPlayersInPosition(): void;
  protected abstract _handleTackle(playerContactObj: PlayerContact): void;
  protected abstract _handleRun(playerContact: PlayerContact): void;
  protected abstract _handleBallContactKicker(
    ballContactObj: BallContact
  ): void;
  abstract handleUnsuccessfulFg(msg: string): void;
  abstract handleSuccessfulFg(msg: string): void;

  onBallContact(ballContactObj: BallContact) {
    // We have to do this check AGAIN because playerOnkick is not an event listener, but a native listener
    if (this.stateExists("ballRan") || this.stateExists("fieldGoalBlitzed"))
      return;

    super.onBallContact(ballContactObj);
  }

  onBallOutOfBounds(ballPosition: Position) {
    // This actually will never run since we stop play when the ball leaves the hashes
  }

  onBallCarrierOutOfBounds(ballCarrierPosition: Position) {
    // Out of bounds like always, check for safety etc
    const { endPosition, netYards, yardAndHalfStr, isTouchdown } =
      this._getPlayDataOffense(ballCarrierPosition);

    if (isTouchdown) return this.handleTouchdown(ballCarrierPosition);

    Chat.send(
      `${ICONS.Pushpin} ${
        this.getBallCarrier().name
      } went out of bounds ${yardAndHalfStr}`
    );

    const { isSafety, isTouchback } =
      GameReferee.checkIfSafetyOrTouchbackPlayer(
        this._startingPosition,
        endPosition,
        Room.game.offenseTeamId
      );

    // Always add rushing stats
    Room.game.stats.updatePlayerStat(this._ballCarrier?.id!, {
      rushingAttempts: 1,
      rushingYards: netYards,
    });

    if (isSafety) return this._handleSafety();
    if (isTouchback) return this._handleTouchback();

    this.endPlay({ newLosX: endPosition.x, netYards });
  }
  onBallCarrierContactOffense(playerContact: PlayerContact) {
    const { player, playerPosition, ballCarrierPosition } = playerContact;

    const isBehindKicker = MapReferee.checkIfBehind(
      playerPosition.x,
      ballCarrierPosition.x,
      player.team as PlayableTeamId
    );

    // If its a legal run, handle it, otherwise its a penalty
    if (isBehindKicker) return this._handleRun(playerContact);

    // Cant run when the ball has already been kicked
    if (this.stateExists("fieldGoalKicked")) return;

    this._handlePenalty("illegalRun", player);
  }

  onBallCarrierContactDefense(playerContact: PlayerContact) {
    this._handleTackle(playerContact);
  }

  onKickDrag(): void {
    this._handlePenalty("fgDrag", this._kicker);
  }

  protected _onBallContactDefense(ballContactObj: BallContact): void {
    // If the field goal was kicked, and it was kicked before the blitz and they touched it

    // If the FG was kicked
    if (this.stateExists("fieldGoalKicked")) {
      console.log(this.readAllState());
      // If it was kicked before the blitz, its a penalty, if it was after, its a block
      if (this.stateExists("fieldGoalLineBlitzed"))
        return this.handleUnsuccessfulFg("Field goal blocked!");
      return this.handleSuccessfulFg("Auto fg, defense kicked it");
    }

    // They blitzed the ball before the kick
    this.setState("fieldGoalBlitzed");
  }

  protected _onBallContactOffense(ballContactObj: BallContact): void {
    const { player } = ballContactObj;

    if (player.id === this._kicker.id)
      return this._handleBallContactKicker(ballContactObj);

    // If offense touches the ball at anytime, its an incomplete field goal

    Chat.send("Illegal fg, touched by offense");
    return this.endPlay({});
  }
}
