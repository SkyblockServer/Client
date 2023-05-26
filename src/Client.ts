import WebSocket from 'ws';
import { getURL } from './utils';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import { ClientEvents } from './Types';

/** Public Client for SkyblockServer */
export default class SkyblockClient extends (EventEmitter as new () => TypedEmitter<ClientEvents>) {
  /** The Active WebSocket */
  public socket: WebSocket;

  /** User UUID */
  public uuid: string;
  /** User Username */
  public username: string;
  /** User Hypixel API Key */
  public apiKey: string;

  /**
   * Public Client for SkyblockServer
   * @param uuid User UUID
   * @param username User Username
   * @param apiKey User Hypixel API Key
   */
  constructor(uuid: string, username: string, apiKey: string) {
    super();

    if (typeof uuid !== 'string') throw new Error('Malformed UUID');
    if (typeof username !== 'string') throw new Error('Malformed Username');
    if (typeof apiKey !== 'string') throw new Error('Malformed Hypixel API Key');

    this.setMaxListeners(0);

    this.uuid = uuid;
    this.username = username;
    this.apiKey = apiKey;

    this.init();
  }

  public init() {
    this.socket = new WebSocket(getURL('WEBSOCKET', true));

    this.socket.on('open', this.onOpen.bind(this));
    this.socket.on('close', this.onClose.bind(this));
    this.socket.on('error', this.onError.bind(this));
    this.socket.on('message', this.onMessage.bind(this));

    this.socket.on('ping', () => this.socket.pong());
  }

  public log(...data: any[]) {
    this.emit('debug', 'log', ...data);
  }
  public warn(...data: any[]) {
    this.emit('debug', 'warn', ...data);
  }
  public error(...data: any[]) {
    this.emit('debug', 'error', ...data);
  }
  public debug(...data: any[]) {
    this.emit('debug', 'debug', ...data);
  }

  public onOpen() {
    this.log('WebSocket Connected!');
  }

  public onClose(code?: number, reason?: Buffer) {
    this.error(`WebSocket Closed${code ? `with Code ${code}` : ''}${reason ? `with Reason "${reason}"` : ''}`);
  }

  public onError(err: Error) {
    throw err;
  }

  public onMessage(data: WebSocket.RawData) {}
}
