import { IncomingPacketIDs, IncomingPacketTypes, OutgoingPacketIDs, readIncomingPacket, readOutgoingPacket, writeOutgoingPacket } from '@skyblock-server/protocol';
import Packet from '@skyblock-server/protocol/dist/Packet';
import EventEmitter, { once } from 'events';
import TypedEmitter from 'typed-emitter';
import WebSocket from 'ws';
import { AuctionCategories, AuctionFetchOptions, AuctionSortOrders, ClientEvents, CloseCodes, ItemRarities } from './Types';
import { getURL } from './utils';

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

  /** The Active Session ID */
  public session: string;
  /** The Sequence Number */
  public seq: number;

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
    this.socket = new WebSocket(getURL('WEBSOCKET', true), {
      headers: this.session
        ? {
            'session-id': this.session,
            seq: this.seq,
          }
        : {},
    });

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
  public throw(message: string) {
    this.error(message);
    throw new Error(message);
  }
  public debug(...data: any[]) {
    this.emit('debug', 'debug', ...data);
  }

  public send(packet: Packet, reject: boolean = false): Promise<boolean> {
    return new Promise((res, rej) => {
      if (this.socket.readyState === WebSocket.OPEN)
        this.socket.send(packet.buf.buffer, err => {
          if (err) {
            if (reject) rej(err);
            else res(false);
          } else res(true);
        });
    });
  }

  public onOpen() {
    this.log('WebSocket Connected!');

    this.seq = 1;

    if (!this.session)
      this.send(
        writeOutgoingPacket(OutgoingPacketIDs.Identify, {
          uuid: this.uuid,
          username: this.username,
          apiKey: this.apiKey,
        })
      );
  }

  public onClose(code: CloseCodes, reason?: string) {
    this.error(`WebSocket Closed${code ? ` with Code ${code}` : ''}${reason ? ` ${code ? 'and' : 'with'} Reason "${reason}"` : ''}`);

    let resume: boolean;

    switch (code) {
      case CloseCodes.HEARTBEAT_FAILED:
        this.warn("WebSocket failed to heartbeat, this shouldn't happen!");

        resume = true;
        break;

      case CloseCodes.INVALID_MESSAGE:
        this.throw("WebSocket sent an invalid message, this shouldn't happen!\nMake sure the package is up-to-date!");

        resume = false;
        break;

      case CloseCodes.INVALID_IDENTIFY:
        this.throw(`Failed to Identify: ${reason}`);

        resume = false;
        break;

      case CloseCodes.RESUME_FAILED:
        this.warn(`Failed to Resume Connection: ${reason}`);

        this.session = null;
        resume = true;
        break;
    }

    if (resume) this.init();
  }

  public onError(err: Error) {
    this.error(...(err.name === 'Error' ? ['Error:', err.name] : [err.name + ':']), err.message);
  }

  public onMessage(raw: WebSocket.RawData) {
    const msg = readIncomingPacket(raw as Buffer);

    this.seq += 1;

    this.emit('message', msg);

    switch (msg.id) {
      case IncomingPacketIDs.SessionCreate:
        this.session = msg.data.session_id;
        this.seq = msg.data.seq;
        break;
    }
  }

  public async awaitMessage<T extends keyof IncomingPacketTypes>(id: T, timeout?: number): Promise<IncomingPacketTypes[T] | null> {
    let aborter = new AbortController();
    if (timeout) setTimeout(() => aborter.abort(), timeout);

    let data = null;

    while (!data && !aborter.signal.aborted) {
      const [msg] = await once(this, 'message', {
        signal: aborter.signal,
      }).catch(() => [{}]);

      if (msg.id == id) data = msg.data;
    }

    return data;
  }

  public async fetchAuctions(options: Partial<AuctionFetchOptions>): Promise<ReturnType<typeof readIncomingPacket<IncomingPacketIDs.Auctions>>['data']['auctions']> {
    const request: ReturnType<typeof readOutgoingPacket<OutgoingPacketIDs.RequestAuctions>>['data'] = {} as any;

    request.query = typeof options.query === 'string' ? options.query : '';

    request.order = AuctionSortOrders.includes(options.order) ? options.order : 'random';

    request.start = typeof options.start === 'number' ? options.start : 0;
    request.amount = typeof options.start === 'number' ? request.amount : 100;

    if (AuctionCategories.includes(options.category?.toLowerCase?.() as any))
      request.filters.push({
        type: 'category',
        value: options.category?.toLowerCase?.(),
      });
    if (ItemRarities.includes(options.rarity.toUpperCase().replace(/ /g, '_') as any))
      request.filters.push({
        type: 'rarity',
        value: options.rarity.toUpperCase().replace(/ /g, '_'),
      });
    if (['auction', 'bin'].includes(options.type.toLowerCase()))
      request.filters.push({
        type: 'type',
        value: options.type.toLowerCase(),
      });

    await this.send(writeOutgoingPacket(OutgoingPacketIDs.RequestAuctions, request));

    const response = await this.awaitMessage(IncomingPacketIDs.Auctions);

    return response.auctions;
  }
}
