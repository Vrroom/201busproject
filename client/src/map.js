import React, { Component } from "react";
import "./css/Mapload.css";
import "./css/Modal.css";
import AnecdoteModal from "./AnecdoteModal";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import { ZoomControl } from "mapbox-gl-controls";
import graph from "./data/connectivity";
import Node from "./node";
import Segment from "./segment";
import { showRoute, hideRoute } from "./utils/geoOps";
import { randomRoute, getNodeIdxById } from "./utils/graphOps";
import StatusBar from "./StatusBar";

mapboxgl.accessToken =
  "pk.eyJ1IjoicHJhbm1hbjExMTAiLCJhIjoiY2trdmg3dDNqMjBidTJ1czFjZnJhdXczbCJ9.iiySDdrwpE0p-hFUAKtU7Q";

class Map extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "Pick any bus stop as source.",
      bus: undefined,
      latLng: [77.5985, 12.9433],
      zoom: 12.3,
      graph: graph
    };
    this.mapContainerRef = React.createRef();
    this.source = undefined;
    this.canHandleNodes = true;
    this.beforeId = graph.nodes[0].id;
  }

  runJourney = () => {
    const { graph } = this.state;
    // Get a sequence of links from source to target.
    const links = randomRoute(graph, {
      source: this.source,
      target: this.target
    });
    showRoute(this.map, links, this.beforeId);
    // chain them.
    if (links.length > 0) {
      this.canHandleNodes = false;
      const segments = links.map(
        link => new Segment({ map: this.map, link }, this.beforeId)
      );
      segments.slice(0, segments.length - 1).map((seg, i) => {
        return seg.onEnd(() => {
          this.setState({ bus: undefined });
          const targetStop = this.nodes[getNodeIdxById(graph, seg.link.target)];
          targetStop.onEnd(() => {
            segments[i + 1].beginAnimate();
          });
          targetStop.beginAnimate();
        });
      });
      segments[segments.length - 1].onEnd(() => {
        this.setState({ bus: undefined, status: "" });
        this.canHandleNodes = true;
        hideRoute(this.map, links);
      });
      segments.map(seg =>
        seg.onBegin(() =>
          this.setState({
            bus: seg.link.bus,
            status: "You are on bus " + seg.link.bus + ". Enjoy Your Journey!"
          })
        )
      );
      const sourceStop = this.nodes[getNodeIdxById(graph, this.source)];
      sourceStop.onEnd(() =>
        segments[0].beginAnimate()
      );
      sourceStop.beginAnimate();
    }
    this.source = undefined;
  };

  handleNodeClick = node => {
    if (this.canHandleNodes) {
      if (typeof this.source === "undefined") {
        this.source = node.id;
        this.setState({ status: "Pick another bus stop as destination." });
      } else {
        this.target = node.id;
        this.runJourney();
      }
    }
  };

  componentDidMount() {
    const { latLng, zoom, graph } = this.state;
    this.map = new mapboxgl.Map({
      container: this.mapContainerRef.current,
      style: "mapbox://styles/pranman1110/ckky1iti20m1l17n5swewr7m3",
      center: latLng,
      zoom: zoom
    });

    // Add navigation control (the +/- zoom buttons)
    this.map.addControl(new ZoomControl(), "top-right");

    this.map.on("move", () => {
      const { lng, lat } = this.map.getCenter();
      this.setState({
        zoom: this.map.getZoom().toFixed(2),
        latLng: [lng, lat]
      });
    });

    this.map.on("load", () => {
      this.nodes = graph.nodes.map(
        node =>
          new Node({
            map: this.map,
            node: node,
            onClick: () => this.handleNodeClick(node)
          })
      );
    });
  }

  render() {
    const { bus, status } = this.state;
    return (
      <div>
        <div>
          <StatusBar bus={bus} status={status} />
        </div>
        {bus && (
          <div className="anecdote-modal Show">
            <AnecdoteModal bus={bus} />
          </div>
        )}
        <div className="map-container" ref={this.mapContainerRef} />
      </div>
    );
  }
}

export default Map;
