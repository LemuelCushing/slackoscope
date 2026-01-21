/**
 * toggleInline command - Toggle inline message display.
 */

import type {DecorationController} from "../controllers"

export async function toggleInline(controller: DecorationController): Promise<void> {
  await controller.toggle()
}
