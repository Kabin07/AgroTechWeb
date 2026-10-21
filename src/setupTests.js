// jest-dom adds custom jest matchers for asserting on DOM nodes.
import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

// jsdom (used by CRA's Jest) lacks these; react-router v7 needs them.
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;
