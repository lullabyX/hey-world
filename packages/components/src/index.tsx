import React from "react";

interface SiteHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
}

const SiteHeader: React.FC<SiteHeaderProps> = ({ title, className, ...props }) => {
  return (
    <header className={className} {...props}>
      {title}
    </header>
  );
};

export default SiteHeader;