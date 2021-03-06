import { FullPlayerObject } from "../HBClient";
import Chat from "./Chat";
import COLORS from "../utils/colors";

export default class Greeter {
  static greetPlayer(player: FullPlayerObject) {
    Chat.send(`!rules for rules, !stats for stats`, {
      id: player.id,
      color: COLORS.LightBlue,
    });
    Chat.send(
      `Whats new: Tight End Position, | Ball emoji | Can use !stats after a game has ended`,
      {
        id: player.id,
        color: COLORS.LightGreen,
      }
    );
  }
}
