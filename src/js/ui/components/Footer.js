// @flow

import * as React from "react";

class Footer extends React.Component<{}> {
    // eslint-disable-next-line class-methods-use-this
    shouldComponentUpdate() {
        return false;
    }

    // eslint-disable-next-line class-methods-use-this
    render() {
        // banner-ad class is so ad blockers remove it cleanly. I'm so nice!
        return (
            <div>
                <p className="clearfix" />

                <div className="banner-ad" style={{ position: "relative" }}>
                    <div
                        id="basketballgm_300x250_BTF_Left"
                        style={{
                            display: "none",
                            textAlign: "center",
                            height: "250px",
                            position: "absolute",
                            top: "5px",
                            left: 0,
                        }}
                        data-refresh-time="-1"
                    />
                    <div
                        id="bbgm-ads-logo"
                        style={{
                            display: "none",
                            height: "250px",
                            margin: "5px 310px 0 310px",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <img
                            alt=""
                            src="https://basketball-gm.com/files/logo.png"
                            style={{
                                maxHeight: "100%",
                                maxWidth: "100%",
                            }}
                        />
                    </div>
                    <div
                        id="basketballgm_300x250_BTF_Right"
                        style={{
                            display: "none",
                            textAlign: "center",
                            height: "250px",
                            position: "absolute",
                            top: "5px",
                            right: 0,
                        }}
                        data-refresh-time="-1"
                    />
                </div>

                <div className="clearfix" />
                <hr />

                <footer>
                    <p>
                        <a
                            href="https://basketball-gm.com/about/"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            About
                        </a>{" "}
                        ·{" "}
                        <a
                            href="https://basketball-gm.com/advertise/"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            Advertise
                        </a>{" "}
                        ·{" "}
                        <a
                            href="https://basketball-gm.com/blog/"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            Blog
                        </a>{" "}
                        ·{" "}
                        <a
                            href="https://basketball-gm.com/contact/"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            Contact
                        </a>{" "}
                        ·{" "}
                        <a
                            href="https://basketball-gm.com/privacy-policy/"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            Privacy Policy
                        </a>{" "}
                        ·{" "}
                        <a
                            href="https://basketball-gm.com/share/"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            Share
                        </a>
                        <br />
                    </p>
                    <p className="rev">
                        Component versions:<br />
                        {window.bbgmVersion} (HTML)<br />
                        {window.bbgmVersionUI} (UI)<br />
                        {window.bbgmVersionWorker} (Worker)
                    </p>
                </footer>
            </div>
        );
    }
}

export default Footer;
