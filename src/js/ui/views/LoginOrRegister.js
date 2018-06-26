import classNames from "classnames";
import React from "react";
import { SPORT, fetchWrapper } from "../../common";
import { local, realtimeUpdate, setTitle, toWorker } from "../util";

const ajaxErrorMsg =
    "Error connecting to server. Check your Internet connection or try again later.";

class LoginOrRegister extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loginError: null,
            registerEmailError: null,
            registerError: null,
            registerPasswordError: null,
            registerPassword2Error: null,
            registerUsernameError: null,
        };
        this.handleLogin = this.handleLogin.bind(this);
        this.handleRegister = this.handleRegister.bind(this);
    }

    async handleLogin(e) {
        e.preventDefault();

        this.setState({ loginError: null });

        const formData = new FormData(document.getElementById("login"));

        try {
            const data = await fetchWrapper({
                url: `//account.basketball-gm.${window.tld}/login.php`,
                method: "POST",
                data: formData,
                credentials: "include",
            });

            if (data.success) {
                const currentTimestamp = Math.floor(Date.now() / 1000);
                local.update({
                    gold: currentTimestamp <= data.gold_until,
                    username: data.username,
                });

                // Check for participation achievement, if this is the first time logging in to this sport
                await toWorker("checkParticipationAchievement", false);
                realtimeUpdate(["account"], "/account");
            } else {
                this.setState({ loginError: "Invalid username or password." });
            }
        } catch (err) {
            this.setState({ loginError: ajaxErrorMsg });
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        this.setState({
            registerEmailError: null,
            registerError: null,
            registerPasswordError: null,
            registerPassword2Error: null,
            registerUsernameError: null,
        });

        const formData = new FormData(document.getElementById("register"));

        try {
            const data = await fetchWrapper({
                url: `//account.basketball-gm.${window.tld}/register.php`,
                method: "POST",
                data: formData,
                credentials: "include",
            });

            if (data.success) {
                local.update({ username: data.username });

                await toWorker("checkParticipationAchievement", true);
                realtimeUpdate([], "/account");
            } else {
                const updatedState = {
                    registerEmailError: null,
                    registerError: null,
                    registerPasswordError: null,
                    registerPassword2Error: null,
                    registerUsernameError: null,
                };

                for (const error of Object.keys(data.errors)) {
                    if (error === "username") {
                        updatedState.registerUsernameError = data.errors[error];
                    } else if (error === "email") {
                        updatedState.registerEmailError = data.errors[error];
                    } else if (error === "password") {
                        updatedState.registerPasswordError = data.errors[error];
                    } else if (error === "password2") {
                        updatedState.registerPassword2Error =
                            data.errors[error];
                    } else if (error === "passwords") {
                        updatedState.registerPasswordError =
                            updatedState.registerPasswordError === null
                                ? ""
                                : updatedState.registerPasswordError; // So it gets highlighted too
                        updatedState.registerPassword2Error =
                            data.errors[error];
                    }
                }

                this.setState(updatedState);
            }
        } catch (err) {
            this.setState({
                registerEmailError: null,
                registerError: ajaxErrorMsg,
                registerPasswordError: null,
                registerPassword2Error: null,
                registerUsernameError: null,
            });
        }
    }

    render() {
        setTitle("Login or Register");

        return (
            <div>
                <h1 />
                <div className="row">
                    <div className="col-lg-3 col-md-2 col-sm-1" />
                    <div className="col-lg-6 col-md-8 col-sm-9">
                        <p>Basketball GM accounts enable two features:</p>
                        <ol>
                            <li>
                                Your achievements will be stored in the cloud.
                                If you don't make an account, you can still{" "}
                                <a href="/account">
                                    view your achievements from leagues in this
                                    browser
                                </a>.
                            </li>
                            <li>
                                You can sign up for Basketball GM Gold, which
                                removes all ads from the game.
                            </li>
                        </ol>
                        <p>
                            That's it. It won't sync your leagues across devices
                            yet. I hope it will some day!
                        </p>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-2 col-md-1 hidden-sm hidden-xs" />
                    <div className="col-lg-3 col-md-4 col-sm-5">
                        <h1>Login</h1>
                        <form onSubmit={this.handleLogin} id="login">
                            <input type="hidden" name="sport" value={SPORT} />
                            <div className="form-group">
                                <label
                                    className="control-label"
                                    htmlFor="login-username"
                                >
                                    Username
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="login-username"
                                    name="username"
                                    required="required"
                                />
                            </div>
                            <div className="form-group">
                                <label
                                    className="control-label"
                                    htmlFor="login-password"
                                >
                                    Password
                                </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    id="login-password"
                                    name="password"
                                    required="required"
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-default btn-primary"
                            >
                                Login
                            </button>
                            <p
                                className="text-danger"
                                id="login-error"
                                style={{ marginTop: "1em" }}
                            >
                                {this.state.loginError}
                            </p>
                        </form>
                        <a href="/account/lost_password">Lost password?</a>
                    </div>
                    <div className="col-sm-2 hidden-xs" />
                    <div className="col-lg-3 col-md-4 col-sm-5">
                        <h1>Register</h1>
                        <form onSubmit={this.handleRegister} id="register">
                            <input type="hidden" name="sport" value={SPORT} />
                            <div
                                className={classNames("form-group", {
                                    "has-error":
                                        this.state.registerUsernameError !==
                                        null,
                                })}
                            >
                                <label
                                    className="control-label"
                                    htmlFor="register-username"
                                >
                                    Username
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="register-username"
                                    name="username"
                                    required="required"
                                    maxLength="15"
                                    pattern="[A-Za-z-0-9-_]+"
                                    title="Letters, numbers, dashes (-), and underscores (_) only"
                                />
                                <span
                                    className="help-block"
                                    id="username-format"
                                >
                                    Letters, numbers, dashes (-), and
                                    underscores (_) only. Max 15 characters.
                                </span>
                                <span className="help-block">
                                    {this.state.registerUsernameError}
                                </span>
                            </div>
                            <div
                                className={classNames("form-group", {
                                    "has-error":
                                        this.state.registerEmailError !== null,
                                })}
                            >
                                <label
                                    className="control-label"
                                    htmlFor="register-email"
                                >
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    className="form-control"
                                    id="register-email"
                                    name="email"
                                    required="required"
                                />
                                <span className="help-block">
                                    {this.state.registerEmailError}
                                </span>
                            </div>
                            <div
                                className={classNames("form-group", {
                                    "has-error":
                                        this.state.registerPasswordError !==
                                        null,
                                })}
                            >
                                <label
                                    className="control-label"
                                    htmlFor="register-password"
                                >
                                    Password
                                </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    id="register-password"
                                    name="password"
                                    required="required"
                                />
                                <span className="help-block">
                                    {this.state.registerPasswordError}
                                </span>
                            </div>
                            <div
                                className={classNames("form-group", {
                                    "has-error":
                                        this.state.registerPassword2Error !==
                                        null,
                                })}
                            >
                                <label
                                    className="control-label"
                                    htmlFor="register-password2"
                                >
                                    Verify Password
                                </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    id="register-password2"
                                    name="password2"
                                    required="required"
                                />
                                <span className="help-block">
                                    {this.state.registerPassword2Error}
                                </span>
                            </div>
                            <div className="checkbox">
                                <label htmlFor="register-mailinglist">
                                    <input
                                        type="checkbox"
                                        defaultChecked="checked"
                                        id="register-mailinglist"
                                        name="mailinglist"
                                    />
                                    Join BBGM Mailing List (Only major
                                    announcements, about once/year)
                                </label>
                            </div>
                            <button
                                type="submit"
                                className="btn btn-default btn-primary"
                            >
                                Create New Account
                            </button>
                            <p
                                className="text-danger"
                                style={{ marginTop: "1em" }}
                            >
                                {this.state.registerError}
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
}

export default LoginOrRegister;
