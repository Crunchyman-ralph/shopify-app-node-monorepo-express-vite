import { Redirect } from '@shopify/app-bridge/actions';
import { useAppBridge, Loading } from '@shopify/app-bridge-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ExitIframe() {
  const app = useAppBridge();
  const { search } = useLocation();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!!app && !!search) {
      const params = new URLSearchParams(search);
      const redirectUri = params.get('redirectUri');

      if (!redirectUri) {
        return;
      }

      const url = new URL(decodeURIComponent(redirectUri));

      if (url.hostname === location.hostname) {
        const redirect = Redirect.create(app);
        redirect.dispatch(
          Redirect.Action.REMOTE,
          decodeURIComponent(redirectUri)
        );
      }
    }
  }, [app, search]);

  return <Loading />;
}
