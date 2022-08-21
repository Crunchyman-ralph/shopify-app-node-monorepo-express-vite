declare module 'react-alert-template-basic' {
  import { AlertComponentPropsWithStyle } from 'react-alert';
  // eslint-disable-next-line react/prefer-stateless-function
  export default class AlertTemplate extends React.Component<AlertComponentPropsWithStyle> {}
}
declare module '*.module.scss' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module '*.png' {
  const value: any;
  export = value;
}

declare module '*.svg' {
  const value: any;
  export = value;
}

declare module '*.jpg' {
  const value: any;
  export = value;
}
