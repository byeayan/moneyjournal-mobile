// declarations.d.ts

declare module "react-native-keyboard-aware-scroll-view" {
  import * as React from "react";
  import {
    ScrollViewProps,
    KeyboardAvoidingViewProps,
    ViewStyle,
    StyleProp,
  } from "react-native";

  export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
    enableOnAndroid?: boolean;
    enableAutomaticScroll?: boolean;
    extraHeight?: number;
    extraScrollHeight?: number;
    innerRef?: any;
    contentContainerStyle?: StyleProp<ViewStyle>;
    keyboardShouldPersistTaps?: "always" | "handled" | "never" | boolean;
    viewIsInsideTabBar?: boolean;
    resetScrollToCoords?: { x: number; y: number };
    onKeyboardWillShow?: (frames: { endCoordinates: { height: number } }) => void;
    onKeyboardWillHide?: (frames: { endCoordinates: { height: number } }) => void;
    onKeyboardDidShow?: (frames: { endCoordinates: { height: number } }) => void;
    onKeyboardDidHide?: (frames: { endCoordinates: { height: number } }) => void;
  }

  export class KeyboardAwareScrollView extends React.Component<
    KeyboardAwareScrollViewProps,
    any
  > {}
}

// Add this for react-native-big-calendar
declare module "react-native-big-calendar" {
  import * as React from "react";
  import { ViewStyle, StyleProp } from "react-native";

  export interface Event {
    title: string;
    start: Date;
    end: Date;
    color?: string;
  }

  export interface BigCalendarProps {
    events: Event[];
    height?: number;
    mode?: "week" | "month";
    swipeEnabled?: boolean;
    weekStartsOn?: 0 | 1;
    hourRowHeight?: number;
    eventCellStyle?: StyleProp<ViewStyle>;
    headerContainerStyle?: StyleProp<ViewStyle>;
    headerTextStyle?: StyleProp<ViewStyle>;
    onPressCell?: (date: Date) => void;
    style?: StyleProp<ViewStyle>;
  }

  export default class BigCalendar extends React.Component<BigCalendarProps, any> {}
}
