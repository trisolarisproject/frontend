import type { PropsWithChildren } from "react";

interface BannerProps extends PropsWithChildren {
  kind?: "info" | "error" | "success";
}

const Banner = ({ children, kind = "info" }: BannerProps) => {
  return <div className={`banner banner-${kind}`}>{children}</div>;
};

export default Banner;