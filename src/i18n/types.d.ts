import type { it } from "@/messages/it";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof it;
  }
}
