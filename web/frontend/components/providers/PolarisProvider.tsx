import React, { useCallback } from 'react';
import { AppProvider } from '@shopify/polaris';
import { useNavigate } from '@shopify/app-bridge-react';
import translations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import { Children } from 'frontend/types/Children';

type LinkLikeComponentProps = {
  /** The url to link to */
  url: string;
  /**	The content to display inside the link */
  children?: React.ReactNode;
  /** Makes the link open in a new tab */
  external?: boolean;
  /** Makes the browser download the url instead of opening it. Provides a hint for the downloaded filename if it is a string value. */
  download?: string | boolean;
  [key: string]: any;
};

const AppBridgeLink: React.FC<LinkLikeComponentProps> = ({
  url,
  children,
  external,
  ...rest
}) => {
  const navigate = useNavigate();
  const handleClick = useCallback(() => {
    navigate(url);
  }, [url]);

  const IS_EXTERNAL_LINK_REGEX = /^(?:[a-z][\d+.a-z-]*:|\/\/)/;

  if (external || IS_EXTERNAL_LINK_REGEX.test(url)) {
    return (
      <a target="_blank" rel="noopener noreferrer" href={url} {...rest}>
        {children}
      </a>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <a onClick={handleClick} {...rest}>
      {children}
    </a>
  );
};

/**
 * Sets up the AppProvider from Polaris.
 * @desc PolarisProvider passes a custom link component to Polaris.
 * The Link component handles navigation within an embedded app.
 * Prefer using this vs any other method such as an anchor.
 * Use it by importing Link from Polaris, e.g:
 *
 * ```
 * import {Link} from '@shopify/polaris'
 *
 * function MyComponent() {
 *  return (
 *    <div><Link url="/tab2">Tab 2</Link></div>
 *  )
 * }
 * ```
 *
 * PolarisProvider also passes translations to Polaris.
 *
 */
export const PolarisProvider: React.FC<Children> = ({ children }) => (
  <AppProvider i18n={translations} linkComponent={AppBridgeLink}>
    {children}
  </AppProvider>
);
