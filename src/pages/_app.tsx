import type { AppProps } from "next/app";
import "../styles/globals.css";

export default function VoronModHubApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
