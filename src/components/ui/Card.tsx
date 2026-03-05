import type { PropsWithChildren } from "react";

const Card = ({ children }: PropsWithChildren) => {
  return <section className="card">{children}</section>;
};

export default Card;